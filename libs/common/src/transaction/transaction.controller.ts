import { User } from '@app/auth/entities/user.schema';
import { RbacService } from '@app/rbac/rbac.service';
import { PermissionsEnum } from '@app/rbac/types';
import { Controller, Get, Param, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';

import { TransactionsService } from './transaction.service';

@Controller('/transactions/')
export class TransactionController {
  constructor(private rbac: RbacService, private transactionsService: TransactionsService) {}

  @Get('csv/general/:loyaltyId')
  async transactionsCsv(@Param('loyaltyId') loyaltyId: string, @Res() res: Response, @Req() req: Request) {
    if (!(await this.rbac.hasPermission((req as any).user as User, PermissionsEnum.viewTransactions))) {
      throw new UnauthorizedException();
    }

    return this.transactionsService.downloadCsv(loyaltyId, res);
  }
}
