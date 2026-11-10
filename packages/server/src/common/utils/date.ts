import { format } from 'date-fns';

export const today = (form = 'yy-MM-dd') => format(new Date(), form);
