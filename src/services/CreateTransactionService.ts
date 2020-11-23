import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Invalid transaction', 400);
    }

    const balance = await (await transactionsRepository.getBalance()).total;

    if (type === 'outcome' && balance < value) {
      throw new AppError('You do not have enough money', 400);
    }

    const categoryRepository = getRepository(Category);

    const checkCategoryExists = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    let categoryId;
    if (checkCategoryExists) {
      categoryId = checkCategoryExists.id;
    } else {
      const categoryCreated = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(categoryCreated);
      categoryId = categoryCreated.id;
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: categoryId,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
