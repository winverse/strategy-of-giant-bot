import { css } from 'styled-system/css';

export default function Home() {
  return (
    <main
      className={css({
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bg: 'gray.50',
      })}
    >
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold' })}>
        Giant&apos;s Strategy
      </h1>
    </main>
  );
}
