import { useRouter } from "next/router";
import { useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

export default function Register() {
  const [email, setEmail] = useState("");
  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dataNastere, setDataNastere] = useState("");
  const [interese, setInterese] = useState("");
  const [adresa, setAdresa] = useState("");
  const [role, setRole] = useState("volunteer");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const validate = () => {
    if (
      !email ||
      !nume ||
      !prenume ||
      !password ||
      !confirmPassword ||
      !dataNastere
    ) {
      setError(
        "All fields are mandatory. Please complete all required fields."
      );
      return false;
    }
    if (!email.includes("@")) {
      setError("Invalid email format. Please enter a valid email address.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match! Please re-enter your password.");
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

    console.log("🔹 Trimitem la backend:", {
      email,
      nume,
      prenume,
      password,
      dataNastere,
      interese,
      adresa,
      role,
    });

    try {
      Swal.fire({
        title: "Processing...",
        text: "Creating your account, please wait...",
        icon: "info",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nume,
          prenume,
          password,
          dataNastere,
          interese,
          adresa,
          role,
        }),
      });

      const data = await response.json();
      console.log("🔹 Răspuns backend:", data);

      if (response.ok) {
        Swal.fire({
          title: "You're In! 🎉",
          text: "Registered successfully! Get ready to log in!",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });

        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      } else {
        setError(data.message || "An error occurred during registration.");
      }
    } catch (error) {
      setError("Server error! Please try again later.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-5">Register</h2>

        {error && (
          <span className="block text-sm font-bold text-center text-red-700 mb-3">
            {error}
          </span>
        )}
        {success && (
          <span className="block text-sm font-bold text-center text-green-700 mb-3">
            {success}
          </span>
        )}

        <div className="flex justify-center space-x-4 mb-4">
          <button
            type="button"
            className={`p-2 w-1/2 text-center border rounded-md transition ${
              role === "volunteer" ? "bg-green-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setRole("volunteer")}
          >
            Volunteer
          </button>
          <button
            type="button"
            className={`p-2 w-1/2 text-center border rounded-md transition ${
              role === "company" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setRole("company")}
          >
            Company
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            className="w-full p-2 border rounded"
            value={nume}
            onChange={(e) => setNume(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            className="w-full p-2 border rounded"
            value={prenume}
            onChange={(e) => setPrenume(e.target.value)}
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
          <input
            type="password"
            placeholder="Confirm password"
            className="w-full p-2 border rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="date"
            placeholder="Birth Date"
            className="w-full p-2 border rounded"
            value={dataNastere}
            onChange={(e) => setDataNastere(e.target.value)}
            required
          />
          <textarea
            placeholder="Interests"
            className="w-full p-2 border rounded"
            value={interese}
            onChange={(e) => setInterese(e.target.value)}
          />
          <input
            type="text"
            placeholder="Address"
            className="w-full p-2 border rounded"
            value={adresa}
            onChange={(e) => setAdresa(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white p-2 rounded"
          >
            Register
          </button>
        </form>

        <span className="flex justify-center mt-5 text-center w-full">
          Already have an account?
          <Link href="/auth/login" className="text-green-500 ms-1">
            {" "}
            Sign in!
          </Link>
        </span>
      </div>
    </div>
  );
}
