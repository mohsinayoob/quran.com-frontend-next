import { useEffect } from 'react';

import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import { ToastStatus, useToast } from '@/dls/Toast/Toast';
import AuthError from '@/types/AuthError';
import { makeRedirectTokenUrl } from '@/utils/auth/apiPaths';

interface AuthProps {
  error?: string;
}

const Auth: React.FC<AuthProps> = ({ error }) => {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('login');

  useEffect(() => {
    if (error) {
      const errorMessage = t(`login-error.${error}`);
      toast(errorMessage, {
        status: ToastStatus.Error,
      });
      router.replace('/');
    }
  }, [error, toast, t, router]);

  return null;
};

const handleTokenRedirection = async (
  context: GetServerSidePropsContext,
  token: string,
  redirectUrl: string,
): Promise<GetServerSidePropsResult<any>> => {
  try {
    const baseUrl = getBaseUrl(context);
    const response = await fetchToken(baseUrl, token, context);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    setProxyCookies(response, context);

    return {
      props: {},
      redirect: {
        destination: redirectUrl,
        permanent: false,
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during token redirection:', error);
    return {
      props: {
        error: AuthError.AuthenticationError,
      },
    };
  }
};

const getBaseUrl = (context: GetServerSidePropsContext): string => {
  return `${context.req.headers['x-forwarded-proto'] || 'http'}://${context.req.headers.host}`;
};

const fetchToken = async (
  baseUrl: string,
  token: string,
  context: GetServerSidePropsContext,
): Promise<Response> => {
  return fetch(`${baseUrl}${makeRedirectTokenUrl(token)}`, {
    method: 'GET',
    headers: {
      cookie: context.req.headers.cookie || '',
    },
    credentials: 'include',
  });
};

const setProxyCookies = (response: Response, context: GetServerSidePropsContext): void => {
  const proxyCookies = response.headers.get('set-cookie');
  if (proxyCookies) {
    const cookiesArray = proxyCookies.split(/,(?=\s*\w+=)/).map((cookie) => cookie.trim());
    context.res.setHeader('Set-Cookie', cookiesArray);
  }
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { r, token } = context.query;
  const redirectUrl = (r || '/') as string;

  if (token) {
    return handleTokenRedirection(context, token as string, redirectUrl);
  }

  return {
    props: {},
    redirect: {
      destination: redirectUrl,
      permanent: false,
    },
  };
};

export default Auth;
