export const metadata = {
  title: 'Futuros Socios — Dashboard',
  description: 'Dashboard de inversión para socios de Futuros Sports Complex',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                font-family: system-ui, -apple-system, sans-serif;
                -webkit-font-smoothing: antialiased;
                background: #F5F0E8;
                color: #2C2C2C;
                margin: 0;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .fade-in {
                animation: fadeIn 0.4s ease-out forwards;
              }
              input:focus {
                outline: none;
                border-color: #B8963E;
                box-shadow: 0 0 0 3px rgba(184,150,62,0.15);
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
