import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Swal from "sweetalert2";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const validate = () => {
    if (!email || !password) {
      setError("All fields are mandatory!");
      return false;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address!");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok) {
        console.log("User logged in successfully!");

        const cleanToken = data.token;
        console.log("Token:", cleanToken);

        localStorage.setItem("authToken", cleanToken);
        localStorage.setItem("userRole", data.user.role);

        Swal.fire({
          title: "Login Successful!",
          text: "Redirecting to your dashboard...",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });

        setTimeout(() => {
          const userRole = data.user.role;
          if (userRole === "admin") {
            router.push("/admin");
          } else if (userRole === "company") {
            router.push("/company");
          } else {
            router.push("/volunteer");
          }
        }, 3000);
      } else {
        switch (data.code) {
          case "USER_NOT_FOUND":
            setError("User does not exist!");
            break;
          case "INCORRECT_PASSWORD":
            setError("Incorrect password!");
            break;
          case "SERVER_ERROR":
            setError("Server error, please try again later.");
            break;
          default:
            setError("An unknown error occurred.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred, please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-5">Login</h2>
        {error && (
          <span className="text-sm font-bold text-center text-red-700">
            {error}
          </span>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white p-2 rounded"
          >
            Login
          </button>
        </form>

        <span className="flex justify-center mt-5 text-center w-full">
          You don't have an account?
          <Link href="/auth/register" className="text-green-500 ms-1">
            {" "}
            Create one!
          </Link>
        </span>
      </div>
    </div>
  );
}
