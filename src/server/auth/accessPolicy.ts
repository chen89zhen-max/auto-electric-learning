import type { AuthenticatedUser } from './session';

export interface AuthAccessDecision {
  allowed: boolean;
  code?: 'PASSWORD_CHANGE_REQUIRED';
  message?: string;
}

export function evaluateAuthenticatedAccess(
  user: AuthenticatedUser,
  options: { allowPasswordChangeRequired?: boolean } = {}
): AuthAccessDecision {
  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    return {
      allowed: false,
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: '首次登录或凭据重置后必须先修改密码',
    };
  }

  return { allowed: true };
}
