import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
  ParseIntPipe,
  UseInterceptors,
  UseGuards,
  HttpStatus,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { Account } from 'src/entities/account.entity';
import { HideSensitiveDataInterceptor } from 'src/interceptors/sensitive.interceptor';
import { JwtGuard } from 'src/guards/jwt.guards';
import { User } from 'src/utils/user.decorator';
import { success } from 'src/utils/api-response.util';
import { RefreshTokenGuard } from 'src/guards/refreshToken.guard';
import { max } from 'moment';

@Controller('accounts')
// @UseInterceptors(HideSensitiveDataInterceptor)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getAllAccounts() {
    return await this.accountService.allAccounts();
  }

  @Post()
  async createAccount(@Body() accountData: Account) {
    return await this.accountService.createAccount(accountData);
  }

  @Put(':id')
  async updateAccount(
    @Param('id') id: number,
    @Body() accountData: Partial<Account>,
  ) {
    return await this.accountService.updateAccount(id, accountData);
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  async getProfile(@User('user') account: Partial<Account>) {
    return await this.accountService.myProfile(account.id);
  }

  @Put(':id/roles')
  async setRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() accountData: Partial<Account>,
  ) {
    return await this.accountService.setRoles(id, accountData);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@Body() authData: { email: string }) {
    return await this.accountService.confirmEmail(authData.email);
  }

  @Post('auth')
  async authenticate(
    @Body() authData: { email: string; password: string },
    @Res() response,
  ) {
    return await this.accountService.login(
      authData.email,
      authData.password,
      response,
    );
  }

  @Delete(':id')
  async deleteAccount(@Param('id') id: number) {
    return await this.accountService.delAccount(id);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @Get('refresh-token')
  async refreshTokens(@User('user') user: Partial<Account>, @Res() response) {
    try {
      const tokens = await this.accountService.refreshTokens(user);
      response.cookie('auth_token', tokens.accessToken, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
      });

      return success({ refresh: tokens.refreshToken }, 'Session refreshed');
    } catch (error) {
      throw new HttpException(
        error(`Error: ${error.message}`),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
