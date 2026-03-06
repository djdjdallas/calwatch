import './globals.css'

export const metadata = {
  title: 'CalWatch — Follow the Money',
  description: 'Visualizing California homelessness spending connections from public government data.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
