import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import AxiosInstance from "../../api/AxiosInstance";
import { useNavigate, Link } from "react-router-dom";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type Errors = Record<string, string> | string | null;

const initialState: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const [formData, setFormData] = useState<FormData>(initialState);
  const [errors, setErrors] = useState<Errors>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const resetForm = () => setFormData(initialState);

  const getFieldError = (name: keyof FormData) => {
    if (!errors || typeof errors !== "object") return undefined;
    return (errors as Record<string, string>)[name];
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    const trimmedFirst = formData.firstName.trim();
    const trimmedLast = formData.lastName.trim();
    const trimmedEmail = formData.email.trim();
    const password = formData.password;

    if (!trimmedFirst) newErrors.firstName = "First name is required";
    else if (trimmedFirst.length > 50)
      newErrors.firstName = "Max length is 50 characters";

    if (!trimmedLast) newErrors.lastName = "Last name is required";
    else if (trimmedLast.length > 50)
      newErrors.lastName = "Max length is 50 characters";

    if (!trimmedEmail) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      newErrors.email = "Invalid email format";

    if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    else {
      if (!/[A-Z]/.test(password))
        newErrors.password =
          "Password must contain at least one uppercase letter";
      else if (!/[a-z]/.test(password))
        newErrors.password =
          "Password must contain at least one lowercase letter";
      else if (!/\d/.test(password))
        newErrors.password = "Password must contain at least one digit";
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
        newErrors.password =
          "Password must contain at least one special character";
    }

    if (password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    return newErrors;
  };

  // helper: map backend snake_case fields to frontend keys
  const mapBackendKeyToFrontend = (key: string): keyof FormData | string => {
    const mapping: Record<string, keyof FormData> = {
      first_name: "firstName",
      last_name: "lastName",
      confirm_password: "confirmPassword",
      password: "password",
      email: "email",
    };
    return mapping[key] ?? key;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors(null);
    setLoading(true);
    setSuccessMsg("");

    const payload = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
    };

    try {
      await AxiosInstance.post("register/", payload);
      setSuccessMsg("Registration was successful!");
      resetForm();
      navigate("/");
    } catch (err: any) {
      // Robust parsing of backend errors
      const backend = err?.response?.data;
      if (backend && typeof backend === "object") {
        const fieldErrors: Record<string, string> = {};
        const values = Object.values(backend);
        // build a map of field->first message (map snake_case keys)
        for (const [k, v] of Object.entries(backend)) {
          const frontKey = mapBackendKeyToFrontend(k);
          if (Array.isArray(v) && v.length > 0)
            fieldErrors[frontKey as keyof FormData] = String(v[0]);
          else fieldErrors[frontKey as keyof FormData] = String(v);
        }

        // If we have at least one field error — show them as object, otherwise fallback to first message string
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else if (values.length > 0) {
          const first = values[0];
          setErrors(Array.isArray(first) ? String(first[0]) : String(first));
        } else {
          setErrors("Error while registering. Please try again.");
        }
      } else {
        setErrors("Error during registration. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="m-16">
        <h3 className="flex justify-center">Form to register new user</h3>

        <form
          onSubmit={handleSubmit}
          className="p-4 flex flex-col gap-3 max-w-md mx-auto"
        >
          {typeof errors === "string" && (
            <div className="text-red-600 mb-2" role="alert">
              {errors}
            </div>
          )}
          {successMsg && (
            <div className="text-white text-lg mb-2">{successMsg}</div>
          )}

          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="border p-2 rounded"
            aria-invalid={!!getFieldError("firstName")}
          />
          {getFieldError("firstName") && (
            <p className="text-red-500 text-base">
              {getFieldError("firstName")}
            </p>
          )}

          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="border p-2 rounded"
            aria-invalid={!!getFieldError("lastName")}
          />
          {getFieldError("lastName") && (
            <p className="text-red-500 text-base">
              {getFieldError("lastName")}
            </p>
          )}

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="border p-2 rounded"
            aria-invalid={!!getFieldError("email")}
          />
          {getFieldError("email") && (
            <p className="text-red-500 text-base">{getFieldError("email")}</p>
          )}

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="border p-2 rounded"
            aria-invalid={!!getFieldError("password")}
            autoComplete="new-password"
          />
          {getFieldError("password") && (
            <p className="text-red-500 text-base">
              {getFieldError("password")}
            </p>
          )}

          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
            className="border p-2 rounded"
            aria-invalid={!!getFieldError("confirmPassword")}
            autoComplete="new-password"
          />
          {getFieldError("confirmPassword") && (
            <p className="text-red-500 text-base">
              {getFieldError("confirmPassword")}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="p-2 rounded disabled:opacity-50"
          >
            {loading ? "Registration..." : "Register"}
          </button>
        </form>

        {/* Links */}
        <div className="link-item text-lg text-center">
          If you are already registered, then{" "}
          <Link to="/" className="text-xl">
            login
          </Link>
        </div>
      </div>
    </section>
  );
}
