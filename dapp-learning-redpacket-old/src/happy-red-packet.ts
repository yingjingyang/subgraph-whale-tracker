import { BigInt } from "@graphprotocol/graph-ts"
import {
  ClaimSuccess as ClaimSuccessEvent,
  CreationSuccess as CreationSuccessEvent,
  RefundSuccess as RefundSuccessEvent
} from "../generated/HappyRedPacket/HappyRedPacket"
import {
  Claim,
  Redpacket,
  Refund
} from "../generated/schema"

export function handleClaimSuccess(event: ClaimSuccessEvent): void {
  let claim = new Claim(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  claim.happyRedPacketId = event.params.id
  claim.claimer = event.params.claimer
  claim.claimedValue = event.params.claimed_value
  claim.tokenAddress = event.params.token_address

  claim.blockNumber = event.block.number
  claim.blockTimestamp = event.block.timestamp
  claim.transactionHash = event.transaction.hash
  claim.redpacket = event.params.id

  claim.save()

  let redpacket = Redpacket.load(event.params.id)
  if (redpacket === null) {
    return
  }
  let oneBigInt = BigInt.fromString("1")
  let tempBigInt = redpacket.number.minus(oneBigInt)
  redpacket.number = tempBigInt
  let zeroBigInt = BigInt.fromString("0")
  if(redpacket.number.equals(zeroBigInt)){
    redpacket.hasRefundedOrAllClaimed = true
  }
  redpacket.save()

}

export function handleCreationSuccess(event: CreationSuccessEvent): void {
  let redpacket = new Redpacket(
    event.params.id
  )
  redpacket.total = event.params.total
  redpacket.happyRedPacketId = event.params.id
  redpacket.name = event.params.name
  redpacket.message = event.params.message
  redpacket.creator = event.params.creator
  redpacket.creationTime = event.params.creation_time
  redpacket.tokenAddress = event.params.token_address
  redpacket.number = event.params.number
  redpacket.ifrandom = event.params.ifrandom
  redpacket.duration = event.params.duration

  redpacket.blockNumber = event.block.number
  redpacket.blockTimestamp = event.block.timestamp
  redpacket.transactionHash = event.transaction.hash
  redpacket.expireTimestamp = event.params.creation_time.plus(event.params.duration)
  redpacket.hasRefundedOrAllClaimed = false

  redpacket.save()
}

export function handleRefundSuccess(event: RefundSuccessEvent): void {
  let entity = new Refund(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.happyRedPacketId = event.params.id
  entity.tokenAddress = event.params.token_address
  entity.remainingBalance = event.params.remaining_balance

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let recdpacket = Redpacket.load(event.params.id)
  if (recdpacket === null) {
    return
  }
  recdpacket.hasRefundedOrAllClaimed = true
  recdpacket.save()
}
