export interface ItemDetail {
  id: string;
  title: string;
  status: 'FOUND' | 'LOST' | 'CLAIMED';
  isOpen: boolean;
  category: string;
  foundAt: string;
  room?: string;
  dateFound: string;
  postedBy: string;
  postedAgo: string;
  description: string;
  images: string[];
}

export const MOCK_CALCULATOR_ITEM: ItemDetail = {
  id: '1',
  title: 'Casio fx-991ES calculator',
  status: 'FOUND',
  isOpen: true,
  category: 'Electronics',
  foundAt: 'Engineering Block',
  room: 'Room 104',
  dateFound: 'Today',
  postedBy: 'Ada O.',
  postedAgo: '5 hours ago',
  description: 'Silver scientific calculator, no cover. Found on a desk after the CPE exam.',
  images: ['/placeholder-calc.jpg'],
};