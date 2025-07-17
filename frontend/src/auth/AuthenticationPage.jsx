import React, { useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

const AuthenticationPage = () => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const isSignIn = location.pathname.includes("/sign-in");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50 relative overflow-hidden transition-all duration-300 px-4">
      {/* Decorative Circles */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-60 z-0"></div>
      <div className="absolute top-80 right-40 w-24 h-24 bg-pink-200 rounded-full opacity-60 z-0"></div>
      <div className="absolute bottom-40 left-60 w-20 h-20 bg-coral-200 rounded-full opacity-60 z-0"></div>
      <div className="relative z-10 w-full flex items-center justify-center">
        {!isLoaded ? (
          <div className="text-gray-600 text-lg animate-pulse">Loading...</div>
        ) : isSignIn ? (
          <SignIn routing="path" path="/sign-in" />
        ) : (
          <SignUp routing="path" path="/sign-up" />
        )}
      </div>
    </div>
  );
};

export default AuthenticationPage;
