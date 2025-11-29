// login.js
import { dataPengguna } from "./data.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  if (!btnLogin) return;

  btnLogin.addEventListener("click", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Mohon isi email dan password terlebih dahulu!");
      return;
    }

    const user = dataPengguna.find(
      (u) => u.email.toLowerCase() === email && u.password === password
    );

    if (user) {
      alert(`Selamat datang, ${user.nama} (${user.role})`);
      localStorage.setItem("userLogin", JSON.stringify(user));
      window.location.href = "index.html";
    } else {
      alert("Email atau password salah!");
    }
  });
});
