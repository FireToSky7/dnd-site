import { useState } from "react";
import { login } from "../api";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await login(loginVal, password);
      localStorage.setItem("token", token);
      if (remember) localStorage.setItem("remember", "1");
      onLogin(user);
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-wrapper" onSubmit={handleSubmit}>
        <h1>Авторизация</h1>
        {error && <div className="login-error">{error}</div>}
        <div className="input-box">
          <input
            type="text"
            placeholder="Логин"
            value={loginVal}
            onChange={(e) => setLoginVal(e.target.value)}
            required
            autoComplete="username"
          />
          <i className="bx bx-user-circle" />
        </div>
        <div className="input-box">
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <i className="bx bxs-lock-alt" />
        </div>
        <div className="remember-forgot">
          <label>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Запомнить
          </label>
          <a href="#">Забыли пароль?</a>
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Вход…" : "Войти"}
        </button>
        <div className="register-link">
          <p>
            Нет аккаунта? <a href="#">Регистрация</a>
          </p>
        </div>
        <p className="login-note">Аккаунты создаёт администратор.</p>
      </form>
    </div>
  );
}
