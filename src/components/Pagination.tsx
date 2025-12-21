"use client"

import React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { motion } from "framer-motion"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}) => {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || currentPage * itemsPerPage)

  const renderPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    // First page
    if (startPage > 1) {
      pages.push(
        <PaginationButton key="first" onClick={() => onPageChange(1)} active={false} aria-label="Go to first page">
          <ChevronsLeft className="h-4 w-4" />
        </PaginationButton>,
      )
    }

    // Previous page
    if (currentPage > 1) {
      pages.push(
        <PaginationButton
          key="prev"
          onClick={() => onPageChange(currentPage - 1)}
          active={false}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </PaginationButton>,
      )
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationButton
          key={i}
          onClick={() => onPageChange(i)}
          active={i === currentPage}
          aria-label={`Page ${i}`}
          aria-current={i === currentPage ? "page" : undefined}
        >
          {i}
        </PaginationButton>,
      )
    }

    // Next page
    if (currentPage < totalPages) {
      pages.push(
        <PaginationButton
          key="next"
          onClick={() => onPageChange(currentPage + 1)}
          active={false}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>,
      )
    }

    // Last page
    if (endPage < totalPages) {
      pages.push(
        <PaginationButton
          key="last"
          onClick={() => onPageChange(totalPages)}
          active={false}
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </PaginationButton>,
      )
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
      <div className="text-sm text-gray-700 mb-4 sm:mb-0">
        {totalItems && (
          <p>
            Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span>{" "}
            of <span className="font-medium">{totalItems}</span> results
          </p>
        )}
        {!totalItems && (
          <p>
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </p>
        )}
      </div>

      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
        {renderPageNumbers()}
      </nav>
    </div>
  )
}

// Helper component for pagination buttons
const PaginationButton: React.FC<{
  children: React.ReactNode
  onClick: () => void
  active: boolean
  "aria-label"?: string
  "aria-current"?: "page" | undefined
}> = ({ children, onClick, active, ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
        active
          ? "z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
      }`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export default Pagination