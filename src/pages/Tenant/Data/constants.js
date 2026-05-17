export const PROPERTIES = [
  {
    id: 'p1',
    title: 'Sunset Apartments',
    type: 'Apartment',
    price: 'R18,500 / mo',
    address: '12 Oak Ave, 3B',
    city: 'Johannesburg',
    state: 'GP',
    beds: 2,
    baths: 2,
    imageUrl: '/hero-image.png',
    images: ['/hero-image.png', '/download.png'],
    amenities: ['Fitness Center', 'Rooftop Pool', 'Secure Parking', 'Pet Friendly'],
    description:
      'Modern, bright apartment with premium finishes. Close to transport and shopping.',
    agent: {
      name: 'Property Manager',
      role: 'Leasing Agent',
      phone: '+27 11 123 4567',
      email: 'leasing@place4u.co.za',
      imageUrl:
        'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&q=80&w=200'
    }
  },
  {
    id: 'p2',
    title: 'Palm Grove Estate',
    type: 'House',
    price: 'R24,000 / mo',
    address: '45 Palm Grove',
    city: 'Cape Town',
    state: 'WC',
    beds: 3,
    baths: 2,
    imageUrl:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=1200'
    ],
    amenities: ['Backyard', 'Garage', 'Secure Parking', 'Pet Friendly'],
    description:
      'Family home in a secure estate with a spacious backyard and modern kitchen.',
    agent: {
      name: 'Fatima Toure',
      role: 'Agent',
      phone: '+27 82 555 0101',
      email: 'fatima@place4u.co.za',
      imageUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
    }
  }
]

export const CONVERSATIONS = [
  {
    id: '1',
    name: 'Property Manager (Sunset Apartments)',
    avatarLetter: 'P',
    lastMessage: 'Hi! We received your application. Can you share proof of income?',
    timestamp: 'Today',
    unread: true
  },
  {
    id: '2',
    name: 'Fatima Toure (Agent)',
    avatarLetter: 'F',
    lastMessage: 'I have 2 more options in your budget—want to see them?',
    timestamp: 'Yesterday',
    unread: false
  }
]

export const MESSAGES = [
  { id: 'm1', isMe: false, content: 'Hi Jason, thanks for reaching out!', timestamp: '09:12' },
  {
    id: 'm2',
    isMe: false,
    content: '',
    attachment: { name: 'Lease_Details.pdf' },
    timestamp: '09:14'
  },
  { id: 'm3', isMe: true, content: 'Got it—sending my documents now.', timestamp: '09:18' }
]

