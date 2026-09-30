import { Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import ProductList from './pages/ProductList.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Login from './pages/Login.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import NotFound from './pages/NotFound.jsx';

// These are browser-side routes. Asking nginx for /products/3 directly (a refresh or
// a shared link) only works because nginx falls back to index.html — see nginx.conf.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="order-confirmed" element={<OrderConfirmation />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
