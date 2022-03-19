import '../styles/globals.css'
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  const a: string = 'ee';
  return <Component {...pageProps} />
}

export default MyApp
