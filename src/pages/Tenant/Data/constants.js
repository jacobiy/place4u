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
    name: 'Property Manager',
    avatarLetter: 'P',
    lastMessage: 'Yah, ke sharp. Wena?',
    timestamp: '2026-06-10 11:55:26.825',
    unread: true
  },
  {
    id: '2',
    name: 'Fatima Toure (Agent)',
    avatarLetter: 'F',
    lastMessage: 'hello',
    timestamp: '2026-06-10 11:46:26.719',
    unread: false
  }
]

export const MESSAGES = [
  {
    id: '00c579dc-2a52-4528-b111-599b8766c4cd',
    sender_id: '69e12942-46e9-477a-9cb7-2e3d8e579738',
    receiver_id: 'ddfb6dd4-938d-491d-92a8-b168853f6688',
    content: 'Sho, o sharp?',
    created_at: '2026-06-10T11:50:53.545Z'
  },
  {
    id: '2b9e536c-0986-4219-87f2-403cd846380',
    sender_id: 'ddfb6dd4-938d-491d-92a8-b168853f6688',
    receiver_id: '69e12942-46e9-477a-9cb7-2e3d8e579738',
    content: 'Yah, ke sharp. Wena?',
    created_at: '2026-06-10T11:55:26.825Z'
  },
  {
    id: 'a99a0d5a-b979-46a9-8d35-8f0adec8c22',
    sender_id: 'ddfb6dd4-938d-491d-92a8-b168853f6688',
    receiver_id: '69e12942-46e9-477a-9cb7-2e3d8e579738',
    content: 'Ola',
    created_at: '2026-06-10T12:33:17.953Z'
  },
  {
    id: 'bd248bbe-e71c-4c4c-9c77-29d38ef0bd3',
    sender_id: '69e12942-46e9-477a-9cb7-2e3d8e579738',
    receiver_id: '83618be2-50cf-4678-beae-47c43',
    content: 'hello',
    created_at: '2026-06-10T11:46:26.719Z'
  }
]

