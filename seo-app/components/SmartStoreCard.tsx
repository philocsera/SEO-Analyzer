'use client'

import { SmartStoreProduct } from '@/types/analysis'
import { Tag, Folder, BadgeCheck } from 'lucide-react'

interface Props {
  storeName: string
  products: SmartStoreProduct[]
}

export default function SmartStoreCard({ storeName, products }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-200">{storeName}</h4>
          <p className="text-xs text-slate-500 mt-0.5">스마트스토어 분석</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{products.length}개 상품</div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">상품 정보를 가져올 수 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => (
            <div
              key={i}
              className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-snug">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">{p.price}</span>
                    {p.brand && (
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3 text-sky-400" />
                        {p.brand}
                      </span>
                    )}
                    {p.category && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {p.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {p.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.keywords.map((kw, ki) => (
                    <span
                      key={ki}
                      className="flex items-center gap-1 text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
