import "./globals.css";
export const metadata = {
  title: "Sportinuity Manager | Team logistics",
  description: "Coordinate sports team logistics.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
