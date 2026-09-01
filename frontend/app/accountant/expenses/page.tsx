import { fetchAPI } from '@/lib/api'
import type { Expense, ExpenseCategory } from '@/lib/accountantTypes'
import ExpenseWorkspace from './ExpenseWorkspace'

export default async function AccountantExpensesPage() {
  const [expenses, categories] = await Promise.all([
    fetchAPI('/accountant/expenses') as Promise<Expense[]>,
    fetchAPI('/accountant/expense-categories') as Promise<ExpenseCategory[]>,
  ])
  return <ExpenseWorkspace expenses={expenses} categories={categories}/>
}
