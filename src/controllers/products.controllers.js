/* eslint-disable import/named */
/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
/* eslint-disable require-jsdoc */
// eslint-disable-next-line import/no-named-as-default, import/no-named-as-default-member
import dotenv from 'dotenv';
import Product from '../services/product.services';
// eslint-disable-next-line import/named
import {
  // eslint-disable-next-line import/named
  users,
  notifications,
  wishlists,
  products,
} from '../database/models';
import { sendEmail } from '../helpers/mail';
import { emailConfig } from '../helpers/emailConfig';
import { notificationTemplate } from '../helpers/mailTemplate';
import {
  deleteProducts, sellerProduct, createProduct, retrieveAllProduct, productError, updateProduct, searchPro, toggleAvailablePro, retrieveOneProduct, viewProductReview
} from '../loggers/product.logger';

dotenv.config();
const validUUID = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[4][a-fA-F0-9]{3}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;

/**
 * the product controller class
 */
export default class Products {
  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async postProduct(req, res) {
    try {
      const { error, value } = await Product.addProduct(
        req.body,
        req.files,
        req.user
      );
      if (error) return res.status(400).json({ message: 'bad request', error });
      const admins = await users.findAll({ where: { role: 'admin' } });

      const newNotification = {
        message: `new product created by ${req.user.username}`,
        type: 'New product',
      };
      const allNotifications = admins.map((admin) => {
        const newN = { ...newNotification };
        newN.receiverId = admin.id;
        const receiver = {
          username: admin.username,
          email: admin.email,
        };
        return { newN, receiver };
      });
      allNotifications.forEach(async (notification) => {
        const { receiver, newN } = notification;
        const notifyEmail = notificationTemplate(
          receiver.username,
          newN.message,
          newN.type,
          `${process.env.SWAGGER_SERVER}/products/${value.id}`
        );
        sendEmail(
          emailConfig({
            email: receiver.email,
            subject: 'Notification !! new product',
            content: notifyEmail,
          })
        );
        await notifications.create(newN);
      });
      createProduct(req, value);
      return res
        .status(201)
        .json({ message: 'product created', product: value });
    } catch (error) {
      productError(req, error);
      return res.status(500).json({ message: 'server error', error });
    }
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async getProductReviews(req, res) {
    const product = await Product.getProduct(req.params.id);
    if (!product || product === null) {
      return res.status(404).json({ message: 'product not found' });
    }
    const productReviews = await Product.getProductReviews(req.params.id);
    viewProductReview();
    return res.status(200).json(productReviews);
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async editProduct(req, res) {
    try {
      const { error, value } = await Product.editProduct(
        req.body,
        req.files,
        req.product
      );
      if (error) return res.status(400).json({ message: 'bad request', error });
      const productId = req.params.id;
      const wishers = await wishlists.findAll({ where: { productId } });
      const NewWishers = wishers.map((wish) => wish.userId);
      const emails = await users.findAll({ where: { id: NewWishers } });
      const newNotification = {
        message: ' Product  you previously wished for  have been updated ',
        type: 'product updated',
      };
      const allNotifications = emails.map((email) => {
        const newN = { ...newNotification };
        newN.receiverId = email.id;
        const receiver = {
          username: email.username,
          email: email.email,
        };
        return { newN, receiver };
      });
      allNotifications.forEach(async (notification) => {
        const { receiver, newN } = notification;
        const notifyEmail = notificationTemplate(
          receiver.username,
          newN.message,
          newN.type,
          `${process.env.SWAGGER_SERVER}/products/${value.id}`
        );
        sendEmail(
          emailConfig({
            email: receiver.email,
            subject: 'Notification !! Updates',
            content: notifyEmail,
          })
        );
        await notifications.create(newN);
      });
      updateProduct(req, value);
      return res
        .status(200)
        .json({ message: 'product edited', product: value });
    } catch (error) {
      productError(req, error);
      return res.status(500).json({ message: 'server error', error });
    }
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async getProducts(req, res) {
    try {
      // const allproducts = await Product.getProducts();
      // eslint-disable-next-line no-use-before-define
      const totalCount = await products.count();
      // eslint-disable-next-line radix
      const page = parseInt(req.query.page) || 1;
      // eslint-disable-next-line radix
      const limit = parseInt(req.query.limit) || totalCount;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const results = {};
      if (endIndex < totalCount) {
        results.next = {
          page: page + 1,
          limit,
        };
      }
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit,
        };
      }
      // eslint-disable-next-line no-use-before-define
      results.results = await products.findAll({
        limit,
        attributes: { exclude: ['sellerId'] },
        include: [
          {
            model: users,
            as: 'seller',
            attributes: ['username', 'email'],
          },
        ],
        offset: startIndex,
      });
      const allproducts = results;
      retrieveAllProduct();
      res
        .status(200)
        .json({ message: 'All products retrieved successfully', allproducts });
      // eslint-disable-next-line no-shadow
    } catch (err) {
      productError(req, err);
      return res
        .status(500)
        .json({ error: err.message, message: 'Failed to retrieve products' });
    }
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async deleteProduct(req, res) {
    try {
      const product = req.product;
      const wishers = await wishlists.findAll({
        where: { productId: product.id },
      });
      const NewWishers = wishers.map((wish) => wish.userId);
      await wishlists.destroy({ where: { productId: product.id } });
      const emails = await users.findAll({ where: { id: NewWishers } });
      const newNotification = {
        message:
          ' Product  you previously wished for  have permanently deleted',
        type: 'product deleted',
      };
      const allNotifications = emails.map((email) => {
        const newN = { ...newNotification };
        newN.receiverId = email.id;
        const receiver = {
          username: email.username,
          email: email.email,
        };
        return { newN, receiver };
      });
      allNotifications.forEach(async (notification) => {
        const { receiver, newN } = notification;
        const notifyEmail = notificationTemplate(
          receiver.username,
          newN.message,
          newN.type,
          `${process.env.SWAGGER_SERVER}/products/${product.id}`
        );
        sendEmail(
          emailConfig({
            email: receiver.email,
            subject: 'Notification !! Updates',
            content: notifyEmail,
          })
        );
        await notifications.create(newN);
      });

      await product.destroy();
      deleteProducts(req, product);
      return res.status(200).json({
        status: 200,
        message: 'Product deleted successfully',
        item: product,
      });
    } catch (error) {
      productError(req, error);
      return res.status(500).json({
        status: 500,
        error: error.message,
      });
    }
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async getProduct(req, res) {
    try {
      if (req.product) return res.status(200).json(req.product);

      const product = await Product.getProduct(req.params.id);
      if (!product || product === null) {
        return res.status(404).json({ message: 'product not found' });
      }
      retrieveOneProduct(req, product);
      return res.status(200).json(product);
    } catch (err) {
      productError(req, err);
      return res
        .status(500)
        .json({ error: err.message, message: 'server product' });
    }
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async sellergetProduct(req, res) {
    try {
      // eslint-disable-next-line no-shadow
      const totalCount = await products.count();
      // eslint-disable-next-line radix
      const page = parseInt(req.query.page) || 1;
      // eslint-disable-next-line radix
      const limit = parseInt(req.query.limit) || totalCount;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const results = {};
      if (endIndex < totalCount) {
        results.next = {
          page: page + 1,
          limit,
        };
      }
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit,
        };
      }
      results.results = await products.findAll({
        where: { sellerId: req.user.id },
        limit,
        attributes: { exclude: ['sellerId'] },
        include: [
          {
            model: users,
            as: 'seller',
            attributes: ['username', 'email'],
          },
        ],
        offset: startIndex,
      });
      const allProducts = results;
      sellerProduct(req, allProducts);
      res
        .status(200)
        .json({
          message: 'All products retrieved successfully',
          allProducts,
        });
    } catch (err) {
      productError(req, err);
      return res
        .status(500)
        .json({ error: err.message, message: 'Failed to retrieve products' });
    }
  }

  static async getProductById(req, res) {
    const id = req.params.id;
    if (!validUUID.test(id)) {
      return res.status(404).json({ message: 'Product not found' });
    }
    try {
      const product = await Product.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      retrieveOneProduct(req, id);
      return res.status(200).json({ product });
    } catch (err) {
      productError(req, err);
      return res
        .status(500)
        .json({ error: err.message, message: 'Failed to retrieve product' });
    }
  }

  static async getProductByIdAndSeller(req, res) {
    const id = req.params.id;
    if (!validUUID.test(id)) {
      return res.status(404).json({ message: 'Product not found' });
    }
    try {
      const product = await Product.getProductByIdAndSeller(id, req.user.id);
      if (!product) {
        return res
          .status(404)
          .json({ message: 'Product not found in your collection' });
      }
      retrieveOneProduct(req, id);
      return res.status(200).json({ product });
    } catch (err) {
      productError(req, err);
      if (err.name === 'CastError' || err.name === 'NotFoundError') {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      return res
        .status(500)
        .json({ error: err.message, message: 'Failed to retrieve product' });
    }
  }

  /**
   * @param {Object} req
   * @param {Object} res
   * @returns {res} response
   */
  static async toggleAvailable(req, res) {
    try {
      const product = await Product.changeAvailable(req.product);
      const productId = req.params.id;
      const wishers = await wishlists.findAll({ where: { productId } });
      const NewWishers = wishers.map((wish) => wish.userId);
      const emails = await users.findAll({ where: { id: NewWishers } });
      const newNotification = {
        message: ' Product  you wished for is currently unavailable',
        type: 'product updated',
      };
      const allNotifications = emails.map((email) => {
        const newN = { ...newNotification };
        newN.receiverId = email.id;
        const receiver = {
          username: email.username,
          email: email.email,
        };
        return { newN, receiver };
      });
      allNotifications.forEach(async (notification) => {
        const { receiver, newN } = notification;
        const notifyEmail = notificationTemplate(
          receiver.username,
          newN.message,
          newN.type,
          `${process.env.SWAGGER_SERVER}/products/${product.id}`
        );
        sendEmail(
          emailConfig({
            email: receiver.email,
            subject: 'Notification !! Updates',
            content: notifyEmail,
          })
        );
        await notifications.create(newN);
      });
      toggleAvailablePro(req, product);
      return res
        .status(201)
        .json({ message: 'availablility changed', product });
    } catch (err) {
      productError(req, err);
      return res
        .status(500)
        .json({ error: err.message, message: 'Failed to retrieve products' });
    }
  }

  static async searchProduct(req, res) {
    try {
      // eslint-disable-next-line no-shadow
      const products = await Product.searchProducts(
        req.query.q,
        req.query.min,
        req.query.max,
        req.query.category
      );
      searchPro(products);
      res.status(200).json(products);
    } catch (error) {
      productError(req, error);
      res.status(500).json({ message: error.message });
    }
  }
}
