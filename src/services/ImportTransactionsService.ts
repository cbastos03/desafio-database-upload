import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import uploadConfig from '../config/upload';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  csv: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ csv }: Request): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const csvFilePath = path.join(uploadConfig.directory, csv);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      // Caso não exista a category, irá incluir uma nova
      .filter(category => !existentCategoriesTitles.includes(category))
      // Exibe apenas uma category caso ela esteja duplicada
      .filter((value, index, self) => self.indexOf(value) === index);

    // Irá percorrer cada nova category e salvar ela em formato de objeto
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
