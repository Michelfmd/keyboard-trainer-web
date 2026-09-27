import { AppProvider } from "../components/app-provider";
import "./globals.css";
export const metadata = {
  title: "Keyboard Trainer Web",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
