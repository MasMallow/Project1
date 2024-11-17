// types.ts
export interface Account {
    id: number;
    name: string;
    type: string;
    balance: number;
    created_at: Date;
    updated_at: Date;
}

export interface Category {
    id: number;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    created_at: Date;
}

export interface Transaction {
    id: number;
    account_id: number;
    category_id: number;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: Date;
    note?: string;
    receipt_path?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Summary {
    total_income: number;
    total_expense: number;
    net_amount: number;
    by_category: {
        category: string;
        amount: number;
        percentage: number;
    }[];
    by_account: {
        account: string;
        balance: number;
    }[];
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        total_pages: number;
        current_page: number;
        limit: number;
        has_next_page: boolean;
        has_prev_page: boolean;
    }
}

export interface TransactionFilter extends PaginationQuery {
    start_date?: string;
    end_date?: string;
    type?: 'INCOME' | 'EXPENSE';
    category_id?: number;
    account_id?: number;
    month?: number;
    year?: number;
}

export interface ImportData {
    type: 'excel' | 'csv' | 'json';
    data: any;
}