import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes.jsx"
import {Routes, Route} from "react-router-dom"
import { Layout } from "./layout/Layout.jsx";
import {AuthenticationPage} from "./auth/AuthenticationPage.jsx";
import Test from "./components/Test.jsx";
import './App.css'

function App() {
    return <ClerkProviderWithRoutes>
        <Routes>
            <Route path="/sign-in/*" element={<AuthenticationPage />} />
            <Route path="/sign-up" element={<AuthenticationPage />} />
            <Route element={<Layout />}>
             {
              // other Routes
             }
             <Route path="/" element={<Test/>}/>
            </Route>
        </Routes>
    </ClerkProviderWithRoutes>
}

export default App