'use client';

import type { SiteDef } from './registry';

import { useState } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  list: number;
  cover: string;
  blurb: string;
}

const BOOKS: Book[] = [
  { id: 'b1', title: 'Harry Potter and the Sorcerer’s Stone', author: 'J.K. Rowling', price: 11.87, list: 16.95, cover: '#7a1f1f', blurb: 'The boy wizard arrives. A #1 national bestseller — get it before your kids do.' },
  { id: 'b2', title: 'Tuesdays with Morrie', author: 'Mitch Albom', price: 13.6, list: 19.95, cover: '#1f4b7a', blurb: 'An old man, a young man, and life’s greatest lesson. Oprah loved it.' },
  { id: 'b3', title: 'The Testament', author: 'John Grisham', price: 16.1, list: 27.95, cover: '#2e6b2e', blurb: 'A suicide, a fortune, and a missing heir in the Brazilian wetlands.' },
  { id: 'b4', title: 'A Man in Full', author: 'Tom Wolfe', price: 15.4, list: 28.95, cover: '#7a5a1f', blurb: 'A sprawling novel of Atlanta, real estate, and reputation.' },
  { id: 'b5', title: 'The Greatest Generation', author: 'Tom Brokaw', price: 13.97, list: 24.95, cover: '#3a3a3a', blurb: 'The men and women who came of age in the Great Depression and WWII.' },
  { id: 'b6', title: 'The 48 Laws of Power', author: 'Robert Greene', price: 17.5, list: 26.0, cover: '#5a1f5a', blurb: 'Amoral, cunning, ruthless, and instructive. A cult favorite.' },
];

export const site: SiteDef = {
  key: 'amazon',
  urls: ['http://www.amazon.com', 'www.amazon.com', 'amazon.com'],
  title: 'Amazon.com — Earth’s Biggest Bookstore',
  keywords: ['amazon', 'books', 'bookstore', 'shopping', 'buy books', 'bestsellers', 'reading', 'cart', 'ecommerce'],
  description: 'Amazon.com, Earth’s Biggest Bookstore — 4.7 million titles, discounted bestsellers, and 1-Click ordering.',
  render: () => <Amazon1999 />,
};

export default function Amazon1999() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutError, setCheckoutError] = useState(false);

  const addToCart = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    setCheckoutError(false);
  };
  const removeFromCart = (id: string) => {
    setCart((c) => {
      const next = { ...c };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  };

  const items = Object.entries(cart);
  const itemCount = items.reduce((n, [, q]) => n + q, 0);
  const total = items.reduce((sum, [id, q]) => sum + (BOOKS.find((b) => b.id === id)?.price ?? 0) * q, 0);

  return (
    <div className="min-h-full bg-white text-black font-[Verdana,Arial,sans-serif] text-[11px]">
      {/* Amazon 1999 wordmark + tab bar */}
      <div className="bg-[#000000] px-3 py-2 flex items-center gap-3">
        <span className="text-[24px] font-bold lowercase" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-white">amazon</span><span className="text-[#ff9900]">.com</span>
        </span>
        <span className="text-[#ff9900] text-[10px] italic">Earth&rsquo;s Biggest Bookstore</span>
        <span className="ml-auto text-white text-[10px]">
          🛒 Shopping Cart: <b className="text-[#ff9900]">{itemCount}</b> item{itemCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="bg-[#ffcc66] text-[#003366] text-[10px] px-3 py-[3px] flex gap-3 border-b border-[#cc9933]">
        <span className="font-bold">Books</span>
        <span className="text-[#996600]">Music</span>
        <span className="text-[#996600]">DVD &amp; Video</span>
        <span className="text-[#996600]">e-Cards</span>
        <span className="ml-auto">FREE Super Saver Shipping on orders over $25</span>
      </div>

      <div className="max-w-[660px] mx-auto px-3 py-3">
        <div className="text-[13px] font-bold text-[#cc6600] mb-2">Today&rsquo;s Featured Bestsellers</div>
        <table className="w-full">
          <tbody>
            {BOOKS.map((b, i) => (
              <tr key={b.id} className={i % 2 ? 'bg-[#f6f6f6]' : 'bg-white'}>
                <td className="align-top p-2 w-[44px]">
                  <div
                    className="w-[36px] h-[48px] border border-[#333] flex items-center justify-center text-white text-[7px] text-center leading-tight px-[2px]"
                    style={{ background: b.cover }}
                  >
                    {b.title.split(' ').slice(0, 3).join(' ')}
                  </div>
                </td>
                <td className="align-top p-2">
                  <div className="text-[#0000cc] underline cursor-pointer font-bold text-[12px]">{b.title}</div>
                  <div className="text-[#666] text-[10px]">by {b.author}</div>
                  <div className="text-[10px] mt-[2px]">{b.blurb}</div>
                  <div className="text-[10px] mt-[2px]">
                    <span className="text-[#666] line-through">List: ${b.list.toFixed(2)}</span>{' '}
                    <span className="text-[#cc0000] font-bold">Our Price: ${b.price.toFixed(2)}</span>{' '}
                    <span className="text-[#009900]">You Save: ${(b.list - b.price).toFixed(2)}</span>
                  </div>
                </td>
                <td className="align-middle p-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => addToCart(b.id)}
                    className="bg-[#ffcc00] text-black border border-[#996600] px-2 py-[3px] text-[10px] font-bold cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Cart */}
        <div className="border-2 border-[#ff9900] bg-[#fff8ee] p-3 mt-4">
          <div className="text-[12px] font-bold text-[#cc6600] mb-2">Your Shopping Cart</div>
          {items.length === 0 ? (
            <div className="text-[10px] text-[#666]">Your cart is empty. Add a book to get started!</div>
          ) : (
            <>
              <table className="w-full text-[10px] mb-2">
                <tbody>
                  {items.map(([id, q]) => {
                    const b = BOOKS.find((x) => x.id === id)!;
                    return (
                      <tr key={id} className="border-b border-[#eecc99]">
                        <td className="py-1">{b.title}</td>
                        <td className="py-1 text-center w-[70px]">
                          <button onClick={() => removeFromCart(id)} className="px-1 border border-[#999] cursor-pointer">-</button>
                          <span className="mx-1">{q}</span>
                          <button onClick={() => addToCart(id)} className="px-1 border border-[#999] cursor-pointer">+</button>
                        </td>
                        <td className="py-1 text-right w-[70px]">${(b.price * q).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="text-right text-[12px] font-bold mb-2">
                Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'}): <span className="text-[#cc0000]">${total.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <button
                  onClick={() => setCheckoutError(true)}
                  className="bg-[#ff9900] text-white border border-[#cc6600] px-3 py-1 text-[11px] font-bold cursor-pointer"
                >
                  Proceed to Checkout
                </button>
              </div>
              {checkoutError && (
                <div className="border-2 border-[#cc0000] bg-white text-[#cc0000] text-[11px] p-2 mt-3">
                  <b>⚠ Please enable cookies to continue.</b>
                  <div className="text-[10px] text-[#333] mt-1">
                    Your browser is not accepting cookies, which are required to complete your secure order.
                    To enable cookies, click the <b>Tools</b> menu, then <b>Internet Options</b>, then <b>Security</b>,
                    and set your zone to <b>Medium</b>. Then return here and try again.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center text-[10px] text-[#999] border-t border-[#ccc] pt-2 mt-3">
          Copyright &copy; 1999 Amazon.com, Inc. All rights reserved. &ldquo;And you&rsquo;re done!&rdquo;
        </div>
      </div>
    </div>
  );
}
