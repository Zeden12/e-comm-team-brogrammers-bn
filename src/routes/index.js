import express from 'express';
import HomeControllers from '../controllers';
import users from './users';
import products from './products';
import wishlist from './wishlist';
import cart from './cart';
import reviews from './reviews.routes';
import checkoutRoutes from './checkout';
import chat from './chat';
import notification from './notification';
import payment from './payment';
import orderRoutes from './order';
import logsroutes from './logs';
import subroutes from './subscribe';

const routes = express();

routes.get('/home', HomeControllers.welcome);
routes.use('/users', users);
routes.use('/products', products);
routes.use('/wishlist', wishlist);
routes.use('/reviews', reviews);
routes.use('/cart', cart);
routes.use('/checkout', checkoutRoutes);
routes.use('/chat', chat);
routes.use('/notification', notification);
routes.use('/payment', payment);
routes.use('/order', orderRoutes);
routes.use('/logs', logsroutes);
routes.use('/subscriber', subroutes);
export default routes;
