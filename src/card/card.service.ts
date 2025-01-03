import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import {
  CardActivityType,
  CardReportDto,
  FundRequestDTO,
  ReportFilterDto,
} from 'src/dtos/card.dto';
import { Account } from 'src/entities/account.entity';
import { CardActivity } from 'src/entities/card-activity.entity';
import { Card } from 'src/entities/card.entity';
import { ApiResponse, error, success } from 'src/utils/api-response.util';
import { Repository } from 'typeorm';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardActivity)
    private readonly cardactivityRepository: Repository<CardActivity>,
  ) {}

  async getCards(status?: string): Promise<ApiResponse<Card[]>> {
    try {
      const cards = await this.cardRepository.find({
        where: status
          ? { status: status as 'active' | 'inactive' | 'suspended' }
          : {},
      });
      return success(cards, 'Cards retrieved successfully');
    } catch (err) {
      return error('Failed to retrieve cards', 500);
    }
  }

  /**
   * Generates a unique barcode by checking against the database and optionally a local set.
   * @param localSet - Optional local Set to ensure uniqueness within a batch.
   * @param prefix - Prefix for the barcode.
   * @returns A promise resolving to a unique barcode string.
   */
  async generateUniqueBarcode(
    localSet: Set<string> = new Set(),
    prefix: string = 'BG',
  ): Promise<string> {
    let barcode: string;
    let isUnique = false;

    while (!isUnique) {
      barcode = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const existingCard = await this.cardRepository.findOne({
        where: { barcode },
      });

      if (!existingCard && !localSet.has(barcode)) {
        isUnique = true;
        localSet.add(barcode);
      }
    }

    return barcode;
  }

  // Single card creation
  async createCard() {
    try {
      const barcode = await this.generateUniqueBarcode();

      const card = this.cardRepository.create({
        barcode,
        referenceNumber: `REF${Date.now()}`,
      });
      const savedCard = await this.cardRepository.save(card);
      return success(savedCard, 'Card created successfully');
    } catch (err) {
      return error('Failed to create card', 500);
    }
  }

  // Bulk card creation
  async createBulkCards(count: number) {
    try {
      const cards = [];
      const barcodes = new Set<string>();

      for (let i = 0; i < count; i++) {
        const barcode = await this.generateUniqueBarcode(barcodes);

        const card = this.cardRepository.create({
          barcode,
          referenceNumber: `REF${Date.now()}-${i}`,
        });
        cards.push(card);
      }

      const savedCards = await this.cardRepository.save(cards);
      return success(savedCards, 'Bulk cards created successfully');
    } catch (err) {
      return error('Failed to create bulk cards', 500);
    }
  }

  // Get card by id
  async getCardById(id: number) {
    try {
      const card = await this.cardRepository.findOne({
        where: { id },
      });
      if (!card) return error('Card not found', 404);
      return success(card, 'Card retrieved successfully');
    } catch (err) {
      return error('Failed to retrieve card', 500);
    }
  }

  // Activate card
  async activateCard(
    cardId: number,
    details: { firstName: string; lastName: string; phoneNumber: string },
  ) {
    try {
      const card = await this.cardRepository.findOne({ where: { id: cardId } });
      if (!card) return error('Card not found', 404);
      if (card.status !== 'inactive')
        return error('Card is not in an activatable state', 400);

      card.firstName = details.firstName;
      card.lastName = details.lastName;
      card.phoneNumber = details.phoneNumber;
      card.status = 'active';
      card.activatedAt = new Date();

      const updatedCard = await this.cardRepository.save(card);
      return success(updatedCard, 'Card activated successfully');
    } catch (err) {
      return error('Failed to activate card', 500);
    }
  }

  // Suspend card
  async suspendCard(cardId: number) {
    try {
      const card = await this.cardRepository.findOne({ where: { id: cardId } });
      if (!card) return error('Card not found', 404);

      card.status = 'suspended';
      const updatedCard = await this.cardRepository.save(card);
      return success(updatedCard, 'Card suspended successfully');
    } catch (err) {
      return error('Failed to suspend card', 500);
    }
  }

  // Request fund loading
  async requestFunds(cardId: number, body: FundRequestDTO, user: Account) {
    try {
      const card = await this.cardRepository.findOne({ where: { id: cardId } });
      if (!card || card.status !== 'active')
        return error('Invalid or inactive card', 400);

      const { amount, description } = body;
      const payload = {
        activity_type: CardActivityType.FUND_REQUEST,
        card,
        amount,
        status: 'pending',
        description,
        requested_by: user.email,
      };

      const fundRequest = this.cardactivityRepository.create(payload);
      const savedRequest = await this.cardactivityRepository.save(fundRequest);
      return success(savedRequest, 'Fund request created successfully');
    } catch (err) {
      return error('Failed to request funds', 500);
    }
  }

  // Approve fund request
  async approveFundRequest(requestId: number, user: Account) {
    try {
      const request = await this.cardactivityRepository.findOne({
        where: { id: requestId },
        relations: ['card'],
      });
      if (!request || request.status !== 'pending')
        return error('Invalid or already processed request', 400);

      request.status = 'approved';
      request.approved_by = user;
      const card = request.card;
      card.loaded += request.amount;
      card.balance += request.amount;

      await this.cardRepository.save(card);

      const transaction = this.cardactivityRepository.create({
        activity_type: CardActivityType.LOAD,
        amount: request.amount,
        card: request.card,
        status: 'completed',
      });

      await this.cardactivityRepository.save(transaction);
      const updatedRequest = await this.cardactivityRepository.save(request);
      return success(updatedRequest, 'Fund request approved successfully');
    } catch (err) {
      return error('Failed to approve fund request', 500);
    }
  }

  // Reject fund request
  async rejectFundRequest(requestId: number, user: Account) {
    try {
      const request = await this.cardactivityRepository.findOne({
        where: { id: requestId },
      });
      if (!request || request.status !== 'pending')
        return error('Invalid or already processed request', 400);

      request.status = 'rejected';
      request.rejected_by = user;
      const updatedRequest = await this.cardactivityRepository.save(request);
      return success(updatedRequest, 'Fund request rejected successfully');
    } catch (err) {
      return error('Failed to reject fund request', 500);
    }
  }

  // charge card for purchase
  async chargeCard(cardId: number, payload: FundRequestDTO) {
    try {
      const card = await this.cardRepository.findOne({ where: { id: cardId } });
      if (!card || card.status !== 'active')
        return error('Invalid or inactive card', 400);

      const { amount, description } = payload;

      if (card.balance < amount) return error('Insufficient funds', 400);

      card.balance -= amount;
      const updatedCard = await this.cardRepository.save(card);

      const transaction = this.cardactivityRepository.create({
        activity_type: CardActivityType.PURCHASE,
        amount,
        description,
        card,
        status: 'completed',
      });

      await this.cardactivityRepository.save(transaction);

      const response = {
        ...updatedCard,
        transaction,
      };

      return success(response, 'Card charged successfully');
    } catch (err) {
      return error('Failed to charge card', 500);
    }
  }
  // get card activity with optional filters
  async getCardActivity(
    cardId: number,
    filter?: ReportFilterDto,
  ): Promise<ApiResponse<CardActivity[]>> {
    try {
      const queryBuilder =
        this.cardactivityRepository.createQueryBuilder('activity');

      if (filter?.startDate || filter?.endDate) {
        queryBuilder.andWhere(
          'activity.timestamp BETWEEN :startDate AND :endDate',
          {
            startDate: filter.startDate || '1900-01-01',
            endDate: filter.endDate || '9999-12-31',
          },
        );
      }

      if (filter?.month && filter?.year) {
        queryBuilder.andWhere(
          'MONTH(activity.timestamp) = :month AND YEAR(activity.timestamp) = :year',
          {
            month: filter.month,
            year: filter.year,
          },
        );
      } else if (filter?.year) {
        queryBuilder.andWhere('YEAR(activity.timestamp) = :year', {
          year: filter.year,
        });
      }

      const activities = await queryBuilder
        .where('activity.cardId = :cardId', { cardId })
        .getMany();

      return success(activities, 'Card activity retrieved successfully');
    } catch (err) {
      return error('Failed to retrieve card activity', 500);
    }
  }

  async generateReport2(
    filter: ReportFilterDto,
  ): Promise<ApiResponse<CardReportDto>> {
    try {
      const queryBuilder = this.cardRepository.createQueryBuilder('card');

      // Apply filters
      if (filter.startDate || filter.endDate) {
        queryBuilder.andWhere(
          'card.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate: filter.startDate || '1900-01-01',
            endDate: filter.endDate || '9999-12-31',
          },
        );
      }

      if (filter.month && filter.year) {
        queryBuilder.andWhere(
          'MONTH(card.createdAt) = :month AND YEAR(card.createdAt) = :year',
          {
            month: filter.month,
            year: filter.year,
          },
        );
      } else if (filter.year) {
        queryBuilder.andWhere('YEAR(card.createdAt) = :year', {
          year: filter.year,
        });
      }

      // Get card statistics
      const [activeCards, inactiveCards] = await Promise.all([
        queryBuilder
          .clone()
          .andWhere('card.status = :status', { status: 'active' })
          .getCount(),
        queryBuilder
          .clone()
          .andWhere('card.status = :status', { status: 'inactive' })
          .getCount(),
      ]);

      // Funds data
      const fundsData = await this.cardactivityRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .addSelect('transaction.type', 'type')
        .groupBy('transaction.type')
        .getRawMany();

      const fundsLoaded =
        fundsData.find((data) => data.type === 'load')?.total || 0;
      const fundsSpent =
        fundsData.find((data) => data.type === 'purchase')?.total || 0;

      // Remaining funds
      const fundsRemaining = await this.cardRepository
        .createQueryBuilder('card')
        .select('SUM(card.balance)', 'total')
        .getRawOne();

      // Card activity trends and engagement (example: group by day/month/year)
      const cardActivityTrends = await this.cardactivityRepository
        .createQueryBuilder('transaction')
        .select('DATE(transaction.timestamp)', 'date')
        .addSelect('COUNT(transaction.id)', 'count')
        .groupBy('DATE(transaction.timestamp)')
        .orderBy('DATE(transaction.timestamp)', 'ASC')
        .getRawMany();

      const customerEngagement = await this.cardRepository
        .createQueryBuilder('card')
        .select('card.phoneNumber', 'customer')
        .addSelect('COUNT(transaction.id)', 'activityCount')
        .leftJoin('card.transactions', 'transaction')
        .groupBy('card.id')
        .getRawMany();

      const report: CardReportDto = {
        activeCards,
        inactiveCards,
        fundsLoaded,
        fundsSpent,
        fundsRemaining: fundsRemaining?.total || 0,
        cardActivityTrends,
        customerEngagement,
      };

      return success(report, 'Report generated successfully');
    } catch (error) {
      console.error(error);
      return error('Failed to generate report', 500);
    }
  }

  async getCardReportWithStats(
    filter?: ReportFilterDto,
  ): Promise<ApiResponse<any>> {
    try {
      let { startDate, endDate } = filter;
      const queryBuilder = this.cardRepository.createQueryBuilder('card');

      // Join with CardActivity
      queryBuilder.leftJoinAndSelect('card.activities', 'activity');

      if (!startDate || startDate === 'null') {
        startDate = moment('1900-01-01', 'DD-MM-YYYY').format('YYYY-MM-DD');
      } else {
        startDate = moment(startDate || '1900-01-01', 'DD-MM-YYYY').format(
          'YYYY-MM-DD',
        );
      }

      if (!endDate || endDate === 'null') {
        endDate = moment(startDate).endOf('day').format('YYYY-MM-DD');
      } else {
        endDate = moment(endDate, 'DD-MM-YYYY')
          .endOf('day')
          .format('YYYY-MM-DD');
      }
      queryBuilder.andWhere('DATE(activity.timestamp) >= :startDate', {
        startDate,
      });

      if (endDate) {
        queryBuilder.andWhere('DATE(activity.timestamp) <= :endDate', {
          endDate,
        });
      }

      // Apply transaction type filter if provided
      if (filter?.transactionType && filter.transactionType !== 'null') {
        queryBuilder.andWhere('activity.activity_type = :type', {
          type: filter.transactionType,
        });
      }

      // Fetch filtered cards
      const filteredCards = await queryBuilder.getMany();

      // Calculate statistics
      const activeCards = filteredCards.filter(
        (card) => card.status === 'active',
      ).length;
      const inactiveCards = filteredCards.filter(
        (card) => card.status === 'inactive',
      ).length;

      const totalFundsRemaining = filteredCards.reduce(
        (sum, card) => sum + card.balance,
        0,
      );

      let totalFundsLoaded = 0;
      let totalFundsSpent = 0;

      filteredCards.forEach((card) => {
        card.activities.forEach((activity) => {
          if (activity.activity_type === CardActivityType.LOAD) {
            totalFundsLoaded += activity.amount;
          } else if (activity.activity_type === CardActivityType.PURCHASE) {
            totalFundsSpent += activity.amount;
          }
        });
      });

      const activityTrends = filteredCards
        .flatMap((card) => card.activities)
        .reduce((trend, activity) => {
          const month = new Date(activity.timestamp)
            .toISOString()
            .substring(0, 7); // YYYY-MM
          if (!trend[month]) trend[month] = 0;
          trend[month]++;
          return trend;
        }, {});

      return success(
        {
          activeCards,
          inactiveCards,
          totalFundsLoaded,
          totalFundsSpent,
          totalFundsRemaining,
          activityTrends,
        },
        'Card statistics retrieved successfully',
      );
    } catch (err) {
      console.log({ err });
      return error('Failed to retrieve card statistics', 500);
    }
  }

  async getFilteredCardActivities(
    filter?: ReportFilterDto,
  ): Promise<ApiResponse<any>> {
    try {
      let { startDate, endDate } = filter;
      const queryBuilder =
        this.cardactivityRepository.createQueryBuilder('activity');

      // Determine date range
      if (!startDate || startDate === 'null') {
        startDate = moment('1900-01-01', 'DD-MM-YYYY').format('YYYY-MM-DD');
      } else {
        startDate = moment(startDate || '1900-01-01', 'DD-MM-YYYY').format(
          'YYYY-MM-DD',
        );
      }

      if (!endDate || endDate === 'null') {
        endDate = moment(startDate).endOf('day').format('YYYY-MM-DD');
      } else {
        endDate = moment(endDate, 'DD-MM-YYYY')
          .endOf('day')
          .format('YYYY-MM-DD');
      }
      // Apply date range filter
      queryBuilder.andWhere('DATE(activity.timestamp) >= :startDate', {
        startDate,
      });

      if (endDate) {
        queryBuilder.andWhere('DATE(activity.timestamp) <= :endDate', {
          endDate,
        });
      }
      // Apply transaction type filter if provided
      if (filter?.transactionType && filter.transactionType !== 'null') {
        queryBuilder.andWhere('activity.activity_type = :type', {
          type: filter.transactionType,
        });
      }

      const activities = await queryBuilder.getMany();

      return success(activities, 'Card activities retrieved successfully');
    } catch (err) {
      return error('Failed to retrieve card activities', 500);
    }
  }

  // get single card by reference
  async getCardByReference(reference: string) {
    try {
      const card = await this.cardRepository.findOne({
        where: [{ referenceNumber: reference }, { barcode: reference }],
      });
      if (!card) return error('Card not found', 404);
      return success(card, 'Card retrieved successfully');
    } catch (err) {
      return error('Failed to retrieve card', 500);
    }
  }
}
