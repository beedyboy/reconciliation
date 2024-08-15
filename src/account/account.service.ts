import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
// import { sign } from 'jsonwebtoken';
import { Account } from 'src/entities/account.entity';
import { success, error } from '../utils/api-response.util';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private jwtService: JwtService,
  ) {}

  async allAccounts() {
    try {
      const accounts = await this.accountRepository.find();
      return success(accounts, 'Accounts fetched successfully');
    } catch (err) {
      return error('Failed to fetch accounts', 500);
    }
  }

  async findByEmail(email: string) {
    try {
      return await this.accountRepository.findOne({ where: { email } });
    } catch (error) {
      throw new NotFoundException('Email does not exist');
    }
  }

  async confirmEmail(email: string) {
    const exist = await this.findByEmail(email);
    if (exist) {
      return success({ exist: true }, 'Email already exist!');
    }

    return success({ exist: false }, 'Email is valid');
  }

  async createAccount(accountData: Partial<Account>) {
    try {
      const check = await this.accountRepository.findOne({
        where: { email: accountData.email },
      });
      if (!check) {
        const hashedPassword = await bcrypt.hash(accountData.password, 10);
        const account = this.accountRepository.create({
          ...accountData,
          password: hashedPassword,
        });

        if (accountData.roles) {
          account.hasRoles = true;
        }

        await this.accountRepository.save(account);
        return success(account, 'Account created successfully');
      } else {
        return error('Email already exists', 400);
      }
    } catch (err) {
      return error('Failed to create account', 500);
    }
  }

  async updateAccount(id: number, accountData: Partial<Account>) {
    try {
      const staff = await this.accountRepository.findOne({ where: { id } });
      if (!staff) {
        throw new NotFoundException('Account not found!');
      }
      staff.firstname = accountData.firstname;
      staff.lastname = accountData.lastname;
      staff.phone = accountData.phone;
      staff.address = accountData.address;
      console.log({ staff, accountData });
      await this.accountRepository.save(staff);
      const updatedAccount = await this.accountRepository.findOne({
        where: { id },
      });
      return success(updatedAccount, 'Account updated successfully');
    } catch (err) {
      return error('Failed to update account', 500);
    }
  }

  async myProfile(id: number) {
    try {
      const profile = await this.accountRepository.findOne({ where: { id } });
      return success(profile, 'Profile fetched successfully');
    } catch (err) {
      return error('Failed to fetch profile', 500);
    }
  }

  async setRoles(id: number, accountData: Partial<Account>) {
    try {
      await this.accountRepository.update(id, {
        roles: accountData.roles,
        home: accountData.home,
        hasRoles: true,
      });
      const updatedAccount = await this.accountRepository.findOne({
        where: { id: accountData.id },
      });
      return success(updatedAccount, 'Roles updated successfully');
    } catch (err) {
      return error('Failed to update roles', 500);
    }
  }

  async login(email: string, password: string, response) {
    try {
      const account = await this.accountRepository.findOne({
        where: { email },
      });

      if (!account) {
        return response.status(404).json({ error: "User doesn't exist" });
      }

      const checkPassword = await bcrypt.compare(password, account.password);
      if (!checkPassword) {
        return response
          .status(401)
          .json({ error: 'Email or password do not match' });
      }

      // Generate access and refresh tokens
      const { accessToken, refreshToken } =
        await this.generateRefreshAndAccessToken(account);

      // Set the access token as an HttpOnly cookie
      response.cookie('auth_token', accessToken, {
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1hour
      });

      let roles;
      try {
        roles =
          typeof account.roles === 'string'
            ? JSON.parse(account.roles)
            : account.roles;
      } catch (parseError) {
        return response
          .status(500)
          .json({ message: 'Error processing roles data' });
      }

      return response.status(200).json({
        message: 'Login successful',
        firstname: account.firstname,
        lastname: account.lastname,
        home: account.home,
        acl: roles,
        refreshToken,
      });
    } catch (err) {
      return response.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateRefreshAndAccessToken(user: Omit<Account, 'password'>) {
    // Generate Access Token
    const accessToken = await this.jwtService.signAsync(
      { user },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRATION, // Shorter lifetime (e.g., '15m')
      },
    );

    // Generate Refresh Token
    const refreshToken = await this.jwtService.signAsync(
      { user },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION, // Longer lifetime (e.g., '7d')
      },
    );

    // Return both tokens
    return { accessToken, refreshToken };
  }

  async refreshTokens(tokenUser: Partial<Account>) {
    const user = await this.findByEmail(tokenUser.email);
    if (!user) {
      throw new HttpException(
        'Error updating session! Please logout and login again',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.generateRefreshAndAccessToken(user);

    return tokens;
  }

  async delAccount(id: number) {
    try {
      await this.accountRepository.delete(id);
      return success(null, 'Account deleted successfully');
    } catch (err) {
      return error('Failed to delete account', 500);
    }
  }
}
