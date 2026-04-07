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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      brand: {
                        gold: '#B8963E',
                        'gold-light': '#D4B96A',
                        brown: '#3D2B1F',
                        'brown-dark': '#2A1D15',
                        cream: '#C4B8A8',
                        'cream-light': '#F5F1EB',
                        'cream-dark': '#A89A8A',
                      }
                    },
                    fontFamily: {
                      serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
                    }
                  }
                }
              }
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                font-family: Georgia, Cambria, 'Times New Roman', serif;
                -webkit-font-smoothing: antialiased;
              }
              .stat-card {
                background: rgba(255,255,255,0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(196,184,168,0.3);
              }
              .gold-gradient {
                background: linear-gradient(135deg, #B8963E 0%, #D4B96A 100%);
              }
              .brown-gradient {
                background: linear-gradient(135deg, #3D2B1F 0%, #5A4030 100%);
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .fade-in {
                animation: fadeIn 0.4s ease-out forwards;
              }
              .tab-active {
                border-bottom: 2px solid #B8963E;
                color: #3D2B1F;
              }
              .tab-inactive {
                border-bottom: 2px solid transparent;
                color: #A89A8A;
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
      <body className="bg-brand-cream-light text-brand-brown min-h-screen">
        {children}
      </body>
    </html>
  );
}
