import type { NextPageContext } from 'next';
import * as Sentry from '@sentry/nextjs';

interface ErrorProps {
  statusCode?: number;
}

function ErrorComponent({ statusCode }: ErrorProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {statusCode ? `${statusCode}` : 'Error'}
        </h1>
        <p style={{ color: '#888' }}>
          {statusCode === 404 ? 'Page Not Found' : 'An unexpected error occurred'}
        </p>
      </div>
    </div>
  );
}

ErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  await Sentry.captureUnderscoreErrorException(contextData);
  const { res, err } = contextData;
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorComponent;
