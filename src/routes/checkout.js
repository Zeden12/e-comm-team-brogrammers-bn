import express from 'express';
import {
  createOrder, getCurrentUserOrders, updateOrder, deleteOrder, viewOrder, getAllOrders,
} from '../controllers/checkout';
import catchError from '../middlewares/catchError';
import isAuthenticated from '../middlewares/verifyToken';
import requestValidator from '../middlewares/requestValidator';
import orderValidation from '../validations/checkout.validation';
import checkRole from '../middlewares/Checkrole';

const router = express.Router();

router.get(
  '/',
  isAuthenticated,
  catchError(getCurrentUserOrders)
);

router.post(
  '/',
  isAuthenticated,
  requestValidator(orderValidation),
  catchError(createOrder)
);

router.get('/orders', isAuthenticated, checkRole(['admin']), catchError(getAllOrders));

router.get('/:order_id', isAuthenticated, checkRole(['buyer', 'admin']), viewOrder);
router.patch('/:order_id', isAuthenticated, checkRole(['buyer', 'admin']), requestValidator(orderValidation), catchError(updateOrder));
router.delete('/:order_id', isAuthenticated, checkRole(['buyer', 'admin']), catchError(deleteOrder));

export default router;
