import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";

export default function Home() {
  const [auth, setAuth] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const router = useRouter();

  const getName = () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        console.log("🔹 Decoded Token:", decodedToken);
        setName(decodedToken.prenume || "Guest");

        const userRole = localStorage.getItem("userRole");
        console.log("🔹 Role from localStorage:", userRole);
        setRole(userRole || "unknown");
      } catch (error) {
        console.error("Error decoding auth token:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to decode authentication token.",
          icon: "error",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    }
  };

  const checkUser = () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      router.push("/auth/login");
    } else {
      setAuth(true);
      getName();
    }
  };

  const logout = () => {
    const token = localStorage.getItem("authToken");

    if (token) {
      Swal.fire({
        title: "Logout",
        text: "Are you sure you want to log out?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, log out",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("userRole");

          Swal.fire({
            title: "Success",
            text: "You have successfully logged out!",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });

          setTimeout(() => {
            router.push("/auth/login");
          }, 2000);
        }
      });
    } else {
      router.push("/auth/login");
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Hello,{" "}
          {auth ? (
            <>
              {name} (
              {role === "admin"
                ? "Admin"
                : role === "volunteer"
                ? "Volunteer"
                : role === "company"
                ? "Company"
                : "Unknown Role"}
              )
            </>
          ) : (
            "Guest"
          )}{" "}
          👋
        </h1>

        {role === "admin" ? (
          <p className="text-lg font-semibold text-gray-700">
            Welcome to the admin panel! Here you can manage users and events.
          </p>
        ) : role === "volunteer" ? (
          <p className="text-lg text-gray-600">
            Welcome to our volunteering platform! Explore events and contribute
            to the community.
          </p>
        ) : role === "company" ? (
          <p className="text-lg text-gray-600">
            Welcome! Manage your events and connect with volunteers.
          </p>
        ) : (
          <p className="text-lg text-gray-600">
            Welcome! Please log in to access your account.
          </p>
        )}

        <button
          onClick={logout}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
