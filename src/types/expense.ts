/** A general business expense (collection `expenses`) — rent, fuel, tools… */
export interface Expense {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
}
