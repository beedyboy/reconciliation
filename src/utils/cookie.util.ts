import { Response } from 'express';

export const setAuthCookies = (
  res: Response,
  token: string,
  refreshToken: string,
): void => {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // use secure cookies in production
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
};
