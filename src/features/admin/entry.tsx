"use client";
import dynamic from "next/dynamic";
const Dashboard = dynamic(() => import("./dashboard"), {
  ssr: false,
  loading: () => (
    <main id="main" className="not-found">
      <p role="status">Đang mở không gian quản trị.</p>
    </main>
  ),
});
export default Dashboard;
