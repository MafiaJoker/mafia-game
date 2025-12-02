<template>
  <el-table
    :data="data"
    stripe
    style="width: 100%"
    :border="true"
    :row-class-name="rowClassName"
  >
    <el-table-column
      label="№"
      width="45"
      align="left"
    >
      <template #default="{ row }">
        {{ row.box_id }}
      </template>
    </el-table-column>

    <slot></slot>
  </el-table>
</template>

<script setup>
defineProps({
  data: {
    type: Array,
    default: () => []
  },
  rowClassName: {
    type: Function,
    default: null
  }
})
</script>
