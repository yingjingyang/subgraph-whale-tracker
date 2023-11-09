import { Address, BigInt,store } from "@graphprotocol/graph-ts"
import {
  Supplied as SuppliedEvent,
  Borrowed as BorrowedEvent,
  Repaid as RepaidEvent,
  Withdrawn as WithdrawnEvent,
  Liquidated as LiquidatedEvent
} from "../generated/MorphoCompound/MorphoCompound"

import { Whale, CompoundPosition } from "../generated/schema"

const zeroBigInt = BigInt.fromString("0")

function convetTokenToName(poolToken:string): string{
  if(poolToken == "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"){
    return "DAI"
  }else if(poolToken == "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4"){
    return "COMP"
  }else if(poolToken == "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5"){
    return "ETH"
  }else if(poolToken == "0x35a18000230da775cac24873d00ff85bccded550"){
    return "UNI"
  }else if(poolToken == "0x39aa39c021dfbae8fac545936693ac917d5e7563"){
    return "USDC"
  }else if(poolToken == "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9"){
    return "USDT"
  }else{
    return poolToken
  }
}

function checkWhale(userId:string): void{
  let whale = Whale.load(userId)
  if(whale === null){
    whale = new Whale(userId)
    whale.save()
  }
}

function getPosition(userId:string,poolToken:string): CompoundPosition{
  let tokenName = convetTokenToName(poolToken)
  let positionId = userId + poolToken
  let compoundPosition = CompoundPosition.load(positionId)
  if(compoundPosition === null){
    compoundPosition = new CompoundPosition(positionId)
    compoundPosition.userId = userId
    compoundPosition.tokenName = tokenName
    compoundPosition.borrowAmount = zeroBigInt
    compoundPosition.supplyAmount = zeroBigInt
    compoundPosition.whale = userId
    compoundPosition.save()
  }

  return compoundPosition
}

function handleSupply(userId:string,poolToken:string,amount:BigInt): void{
  checkWhale(userId)

  let compoundPosition = getPosition(userId,poolToken)
  let newPositionSupplyAmount = compoundPosition.supplyAmount.plus(amount)
  compoundPosition.supplyAmount = newPositionSupplyAmount

  compoundPosition.save()
}

export function handleCompoundSupplied(event: SuppliedEvent): void {
  let userId = event.params._onBehalf.toHexString()
  let poolToken = event.params._poolToken.toHexString()
  handleSupply(userId,poolToken,event.params._amount)
}


export function handleCompoundBorrowed(event: BorrowedEvent): void {
  let userId = event.params._borrower.toHexString()
  checkWhale(userId)

  let changeAmount = event.params._amount
  let poolToken = event.params._poolToken.toHexString()
  let compoundPosition = getPosition(userId,poolToken)
  let newPositionBorrowAmount = compoundPosition.borrowAmount.plus(changeAmount)
  compoundPosition.borrowAmount = newPositionBorrowAmount

  compoundPosition.save()

}

export function handleCompoundRepaid(event: RepaidEvent): void {
  let userId = event.params._onBehalf.toHexString()
  checkWhale(userId)

  let changeAmount = event.params._amount
  let poolToken = event.params._poolToken.toHexString()
  let compoundPosition = getPosition(userId,poolToken)
  let newPositionBorrowAmount = compoundPosition.borrowAmount.minus(changeAmount)
  if(newPositionBorrowAmount.le(zeroBigInt)){
    store.remove('CompoundPosition',compoundPosition.id)
  }else{
    compoundPosition.borrowAmount = newPositionBorrowAmount
    compoundPosition.save()
  }
}

export function handleCompoundWithdrawn(event: WithdrawnEvent): void {
  let userId = event.params._supplier.toHexString()
  checkWhale(userId)

  let changeAmount = event.params._amount
  let poolToken = event.params._poolToken.toHexString()
  let compoundPosition = getPosition(userId,poolToken)
  let newPositionSupplyAmount = compoundPosition.supplyAmount.minus(changeAmount)
  if(newPositionSupplyAmount.le(zeroBigInt)){
    store.remove('CompoundPosition',compoundPosition.id)
  }else{
    compoundPosition.supplyAmount = newPositionSupplyAmount
    compoundPosition.save()
  }

}


export function handleCompoundLiquidated(event: LiquidatedEvent): void {
  let userId = event.params._liquidated.toHexString()
  checkWhale(userId)
  
  let repaidAmount = event.params._amountRepaid
  let liquidatedAmount = event.params._amountSeized

  let poolTokenBorrowedAddress = event.params._poolTokenBorrowedAddress.toHexString()
  let compoundBorrowPosition = getPosition(userId,poolTokenBorrowedAddress)
  let newCompoundBorrowAmount = compoundBorrowPosition.borrowAmount.minus(repaidAmount)
  if(newCompoundBorrowAmount.le(zeroBigInt)){
    store.remove('CompoundPosition',compoundBorrowPosition.id)
  }else{
    compoundBorrowPosition.borrowAmount = newCompoundBorrowAmount
    compoundBorrowPosition.save()
  }

  let poolTokenCollateralAddress = event.params._poolTokenCollateralAddress.toHexString()
  let compoundSupplyPosition = getPosition(userId,poolTokenCollateralAddress)
  let newCompoundSupplyAmount = compoundSupplyPosition.supplyAmount.minus(liquidatedAmount)
  if(newCompoundBorrowAmount.le(zeroBigInt)){
    store.remove('CompoundPosition',compoundSupplyPosition.id)
  }else{
    compoundSupplyPosition.supplyAmount = newCompoundSupplyAmount
    compoundSupplyPosition.save()
  }
}