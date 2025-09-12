import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await auth.login(email, password);
      navigate("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Incorrect email or password");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="m-16">
        <form
          onSubmit={handleSubmit}
          className="p-4 flex flex-col gap-3 max-w-md mx-auto"
        >
          <h2 className="text-2xl font-bold text-center">Login</h2>

          <input
            className="border p-2 rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <input
            className="border p-2 rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="p-2 rounded disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="link-item text-lg text-center mt-4">
          No account yet? Please{" "}
          <Link to="/register" className="text-xl">
            register
          </Link>
        </div>
      </div>
    </section>
  );
}
