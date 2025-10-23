'use client'

import { ZipManagerProps } from '../types'
import { getBackendUrl } from '../../../lib/getBackendUrl'

const ZipManager = ({ 
  zipList, 
  selectedZip, 
  onZipSelect, 
  loadingZip, 
  onDownload 
}: ZipManagerProps) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const zipName = e.target.value
    onZipSelect(zipName)
  }

  const handleDownload = () => {
    if (selectedZip) {
      onDownload(selectedZip)
    }
  }

  return (
    <div className="w-49 text-center">
      <div className="text-primary py-0.5">
        <div className="flex justify-center py-0.5">
          <select 
            className="select select-primary w-48 max-w-xs text-sm" 
            onChange={handleSelectChange} 
            value={selectedZip ?? ''}
            disabled={loadingZip}
          >
            <option value="" className="text-center">
              {loadingZip ? '読み込み中...' : '-- Please select --'}
            </option>
            {zipList.length
              ? zipList.map((zip) => (
                  <option value={zip} key={zip}>
                    {zip}
                  </option>
                ))
              : null}
          </select>
        </div>
      </div>
      <div className="py-0.5">
        <button 
          type="button"
          className="btn btn-secondary w-48"
          onClick={handleDownload}
          disabled={!selectedZip}
        >
          ZIP File Download
        </button>
      </div>
    </div>
  )
}

export default ZipManager



