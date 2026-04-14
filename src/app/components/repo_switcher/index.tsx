import React from 'react'
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material'
import { useActiveRepo } from '../../shared/repos/context'
import { repoKey } from '../../shared/repos/config'

const ALL_VALUE = '__all__'

export const RepoSwitcher: React.FC = () => {
  const { repos, activeRepo, setActiveRepo } = useActiveRepo()

  if (repos.length <= 1) return null

  const handleChange = (event: SelectChangeEvent<string>) => {
    const v = event.target.value
    if (v === ALL_VALUE) {
      setActiveRepo(null)
      return
    }
    const next = repos.find((r) => repoKey(r) === v)
    if (next) setActiveRepo(next)
  }

  return (
    <FormControl size="small" className="no-print" sx={{ minWidth: 220 }}>
      <InputLabel id="repo-switcher-label">リポジトリ</InputLabel>
      <Select
        labelId="repo-switcher-label"
        label="リポジトリ"
        value={activeRepo ? repoKey(activeRepo) : ALL_VALUE}
        onChange={handleChange}
      >
        <MenuItem value={ALL_VALUE}>全リポジトリ合計 ({repos.length})</MenuItem>
        {repos.map((r) => {
          const key = repoKey(r)
          return (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )
}
