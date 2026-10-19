import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";
import SiteLayout from "./components/layout/SiteLayout";
import { RequireAuth, RouteFallback } from "./components/layout/Guards";
import NotFound from "./pages/NotFound";

const Home = lazy(() => import("./pages/Home/Home"));
const Auth = lazy(() => import("./pages/Auth/Auth"));
const Cart = lazy(() => import("./pages/Cart/Cart"));
const Checkout = lazy(() => import("./pages/Checkout/Checkout"));
const Orders = lazy(() => import("./pages/Orders/Orders"));
const OrderDetail = lazy(() => import("./pages/Orders/OrderDetail"));

const App = () => (
    <>
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3500 }} />
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/login" element={<Auth />} />
                <Route element={<SiteLayout />}>
                    <Route index element={<Home />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
                    <Route path="orders" element={<RequireAuth><Orders /></RequireAuth>} />
                    <Route path="orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </Suspense>
    </>
);

export default App;
