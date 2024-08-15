import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
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
      throw new UnauthorizedException('Invalid JWT token');
    }

    // if (request?.user) {
    //   const user = request.user;

    //   //check user with the user service using userId
    //   const userExists = await this.authService.findUserById(user.userId);
    //   const userRole = { ...userExists.account };
    //   if (!userExists) {
    //     throw new NotFoundException({
    //       message: 'Not Found',
    //       status: false,
    //       statuscode: HttpStatus.NOT_FOUND,
    //       data: 'User does not exist',
    //     });
    //   }
    //   //check roles with the user service
    //   if (userRole.role !== user.role) {
    //     throw new HttpException(
    //       {
    //         message: 'Access Denied!!!',
    //         status: false,
    //         statuscode: HttpStatus.UNAUTHORIZED,
    //         data: 'You do not have the permission to access this route',
    //       },
    //       HttpStatus.UNAUTHORIZED,
    //     );
    //   }
    //   //check roles with the auth service using userId
    //   return roles.includes(user.role);
    // }
    // // return false;
    // return false;
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
