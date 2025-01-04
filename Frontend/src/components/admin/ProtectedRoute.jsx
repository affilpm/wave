import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { Admin_isAuthenticated,} = useSelector((state) => state.admin);

  if (!Admin_isAuthenticated) {
    return <Navigate to="/adminlogin" replace />;
  }


  return children;
};

export default ProtectedRoute;