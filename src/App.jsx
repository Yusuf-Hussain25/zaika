import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";
import SiteLayout from "./components/layout/SiteLayout";
import { RouteFallback } from "./components/layout/Guards";
import NotFound from "./pages/NotFound";

const Home = lazy(() => import("./pages/Home/Home"));
const Auth = lazy(() => import("./pages/Auth/Auth"));

const App = () => (
    <>
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3500 }} />
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/login" element={<Auth />} />
                <Route element={<SiteLayout />}>
                    <Route index element={<Home />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </Suspense>
    </>
);

export default App;
