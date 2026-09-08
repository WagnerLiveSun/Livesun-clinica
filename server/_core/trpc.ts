import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getActiveClinicId } from "./cookies";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Resolve o clinicaId ativo: para usuários comuns,, é o da própria conta;
// para master/consultores,, é o da clínica ativa memorizada no cookie (0 = ainda não escolheu ambiente).
function resolveClinicaId(ctx: TrpcContext, user: NonNullable<TrpcContext["user"]>): number {
  if (user.role !== "master") {
    if (!user.clinicaId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Este usuário não está vinculado a uma clínica ativa." });
    }
    return user.clinicaId;
  }
  return getActiveClinicId(ctx.req) ?? 0;
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      clinicaId: resolveClinicaId(ctx, ctx.user),
      isMaster: ctx.user.role === "master",
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'master')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    
    const isMaster = ctx.user.role === 'master';
    if (!isMaster && !ctx.user.clinicaId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Este usuário não está vinculado a uma clínica ativa." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        clinicaId: resolveClinicaId(ctx, ctx.user),
        isMaster: ctx.user.role === 'master',
      },
    });
  }),
);

export const masterProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'master') {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a usuários master." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        clinicaId: null, // Master tem acesso global
        isMaster: true,
      },
    });
  }),
);
