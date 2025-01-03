import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
// import { AccountService } from 'src/account/account.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    // private readonly authService: AccountService,
    private readonly jwtService: JwtService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const roles = this.reflector.get<string[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException('No JWT token found');
    }
    try {
      const decodedToken = this.jwtService.verify(token);
      // console.log('decodedToken', decodedToken);
      request.user = decodedToken;
      return true;
    } catch (error) {
      throw new ForbiddenException(
        'Forbidden: You do not have permission to access this resource',
      );
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    if (request.cookies && request.cookies.accessToken) {
      return request.cookies.accessToken;
    }

    if (request.headers.authorization) {
      const authHeader = request.headers.authorization;
      const [bearer, token] = authHeader.split(' ');
      if (bearer === 'Bearer' && token) {
        return token;
      }
    }

    return null;
  }
}
