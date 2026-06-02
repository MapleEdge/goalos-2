import { generateRequestId } from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { trackError } from '@/lib/errors/monitoring'
import { errorResponse } from '@/lib/errors/response'
import { ValidationError } from '@/lib/errors/types'

interface BackupSnapshot {
  version: number
  exportedAt: string
  data: BackupData
}

interface BackupData {
  values?: BackupRow[]
  goals?: BackupRow[]
  stakeholders?: BackupRow[]
  prerequisites?: BackupRow[]
  evidence?: BackupRow[]
  actions?: BackupRow[]
  relationships?: BackupRow[]
  vehicles?: BackupRow[]
  vehicleGoals?: BackupRow[]
  opportunities?: BackupRow[]
  controlDimensions?: BackupRow[]
  calendarConnections?: BackupRow[]
  scheduleEvents?: BackupRow[]
  resourceTypes?: BackupRow[]
  resourceFlows?: BackupRow[]
  events?: BackupRow[]
}

interface BackupRow {
  id: string
  values?: { id: string }[]
  [key: string]: unknown
}

function isBackupSnapshot(body: unknown): body is BackupSnapshot {
  if (typeof body !== 'object' || body === null) return false
  const obj = body as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    typeof obj.exportedAt === 'string' &&
    typeof obj.data === 'object' &&
    obj.data !== null
  )
}

/**
 * Strip virtual/relation fields so we pass only raw columns to Prisma.
 */
function stripRelations(
  row: BackupRow,
  ...keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const k of keys) delete out[k]
  return out
}

/**
 * Prisma delegate interface — the subset of methods we need for backup import.
 * We cast each real Prisma delegate to this interface because the concrete
 * `SelectSubset<T, …>` signatures are contravariant and don't accept `unknown`.
 * This is safe: the data comes from Prisma's own `findMany` during export.
 */
interface PrismaDelegate {
  upsert(args: {
    where: { id: string }
    update: Record<string, unknown>
    create: Record<string, unknown>
  }): Promise<unknown>
  update(args: {
    where: { id: string }
    data: Record<string, unknown>
  }): Promise<unknown>
}

function asDelegate(d: unknown): PrismaDelegate {
  return d as PrismaDelegate
}

/**
 * POST /api/backup/import
 *
 * Accepts a JSON snapshot (from /api/backup/export) and restores all data
 * inside a single transaction. Existing rows with matching ids are updated;
 * new rows are created.
 *
 * Query params:
 *   ?mode=replace  — wipe all tables before importing (destructive full restore)
 *   ?mode=merge    — upsert only (default)
 */
export async function POST(request: Request) {
  const requestId = generateRequestId()
  try {
    const body = await request.json()

    if (!isBackupSnapshot(body)) {
      throw new ValidationError(
        'Invalid backup format: expected {version, exportedAt, data}'
      )
    }
    if (body.version !== 1) {
      throw new ValidationError(`Unsupported backup version: ${body.version}`)
    }

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'merge'
    if (mode !== 'merge' && mode !== 'replace') {
      throw new ValidationError('mode must be "merge" or "replace"')
    }

    const d = body.data

    const result = await prisma.$transaction(
      async (tx) => {
        if (mode === 'replace') {
          await tx.event.deleteMany()
          await tx.resourceFlow.deleteMany()
          await tx.resourceType.deleteMany()
          await tx.scheduleEvent.deleteMany()
          await tx.calendarConnection.deleteMany()
          await tx.controlDimension.deleteMany()
          await tx.opportunity.deleteMany()
          await tx.vehicleGoal.deleteMany()
          await tx.relationship.deleteMany()
          await tx.action.deleteMany()
          await tx.evidence.deleteMany()
          await tx.prerequisite.deleteMany()
          await tx.vehicle.deleteMany()
          await tx.stakeholder.deleteMany()
          await tx.goal.deleteMany()
          await tx.value.deleteMany()
        }

        const counts: Record<string, number> = {}

        async function importRows(
          name: string,
          rows: BackupRow[] | undefined,
          delegate: PrismaDelegate,
          hasValues: boolean
        ) {
          if (!rows?.length) return
          for (const row of rows) {
            const valueIds = row.values?.map((v) => v.id) ?? []
            const clean = hasValues
              ? stripRelations(row, 'values')
              : stripRelations(row)
            const { id, ...rest } = clean
            await delegate.upsert({
              where: { id: id as string },
              update: rest,
              create: clean,
            })
            if (hasValues && valueIds.length) {
              await delegate.update({
                where: { id: id as string },
                data: {
                  values: { set: valueIds.map((vid) => ({ id: vid })) },
                },
              })
            }
          }
          counts[name] = rows.length
        }

        // Import in dependency order
        await importRows('values', d.values, asDelegate(tx.value), false)
        await importRows('goals', d.goals, asDelegate(tx.goal), true)
        await importRows(
          'stakeholders',
          d.stakeholders,
          asDelegate(tx.stakeholder),
          true
        )
        await importRows(
          'prerequisites',
          d.prerequisites,
          asDelegate(tx.prerequisite),
          true
        )
        await importRows('evidence', d.evidence, asDelegate(tx.evidence), true)
        await importRows('actions', d.actions, asDelegate(tx.action), true)
        await importRows('vehicles', d.vehicles, asDelegate(tx.vehicle), true)
        await importRows(
          'relationships',
          d.relationships,
          asDelegate(tx.relationship),
          false
        )
        await importRows(
          'vehicleGoals',
          d.vehicleGoals,
          asDelegate(tx.vehicleGoal),
          false
        )
        await importRows(
          'opportunities',
          d.opportunities,
          asDelegate(tx.opportunity),
          true
        )
        await importRows(
          'controlDimensions',
          d.controlDimensions,
          asDelegate(tx.controlDimension),
          false
        )
        await importRows(
          'calendarConnections',
          d.calendarConnections,
          asDelegate(tx.calendarConnection),
          false
        )
        await importRows(
          'scheduleEvents',
          d.scheduleEvents,
          asDelegate(tx.scheduleEvent),
          true
        )
        await importRows(
          'resourceTypes',
          d.resourceTypes,
          asDelegate(tx.resourceType),
          false
        )
        await importRows(
          'resourceFlows',
          d.resourceFlows,
          asDelegate(tx.resourceFlow),
          false
        )
        await importRows('events', d.events, asDelegate(tx.event), false)

        return counts
      },
      { timeout: 120_000 }
    )

    return NextResponse.json({
      ok: true,
      mode,
      importedAt: new Date().toISOString(),
      counts: result,
    })
  } catch (err) {
    trackError(
      err instanceof ValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
    )
    return errorResponse(err, {
      requestId,
      endpoint: 'POST /api/backup/import',
    })
  }
}
