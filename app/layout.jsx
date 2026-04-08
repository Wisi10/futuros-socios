export const metadata = {
  title: 'Futuros Socios — Dashboard',
  description: 'Dashboard de inversion para socios de Futuros Sports Complex',
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
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes barGrow {
                from { width: 0; }
              }
              .fade-up {
                animation: fadeUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
              }
              .kpi-card {
                animation: fadeUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
              }
              .kpi-card:nth-child(1) { animation-delay: 0.1s; }
              .kpi-card:nth-child(2) { animation-delay: 0.2s; }
              .kpi-card:nth-child(3) { animation-delay: 0.3s; }
              .kpi-card:nth-child(4) { animation-delay: 0.4s; }
              .kpi-card:nth-child(5) { animation-delay: 0.15s; }
              .kpi-card:nth-child(6) { animation-delay: 0.25s; }
              .kpi-card:nth-child(7) { animation-delay: 0.35s; }
              .section-enter {
                animation: fadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s backwards;
              }
              .card-hover {
                transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
              }
              .card-hover:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.06);
              }
              .bar-grow {
                animation: barGrow 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s backwards;
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
