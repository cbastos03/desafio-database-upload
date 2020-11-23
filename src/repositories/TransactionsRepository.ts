import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const income = transactions.reduce(function (acumulador, valorAtual) {
      if (valorAtual.type === 'income') {
        acumulador += valorAtual.value;
      }
      return acumulador;
    }, 0);
    const outcome = transactions.reduce(function (acumulador, valorAtual) {
      if (valorAtual.type === 'outcome') {
        acumulador += valorAtual.value;
      }
      return acumulador;
    }, 0);

    const balance: Balance = {
      income,
      outcome,
      total: income - outcome,
    };

    return balance;
  }
}

export default TransactionsRepository;
